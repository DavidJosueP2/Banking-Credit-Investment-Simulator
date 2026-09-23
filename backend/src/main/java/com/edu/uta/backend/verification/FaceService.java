package com.edu.uta.backend.verification;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.CreateFaceLivenessSessionRequest;
import software.amazon.awssdk.services.rekognition.model.FaceDetail;
import software.amazon.awssdk.services.rekognition.model.Image;
import software.amazon.awssdk.services.rekognition.model.InvalidParameterException;
import software.amazon.awssdk.services.rekognition.model.QualityFilter;
import software.amazon.awssdk.services.rekognition.model.ResourceNotFoundException;
import software.amazon.awssdk.services.rekognition.model.UnindexedFace;

@Service
public class FaceService {

    private static final float MIN_FACE_CONFIDENCE = 90f;
    private static final float MIN_BRIGHTNESS = 20f;
    private static final float MAX_ANGLE = 35f;
    /** La cédula trae una foto fantasma diminuta: se ignora si es mucho menor que la principal. */
    private static final double SECONDARY_FACE_RATIO = 0.4;

    private final RekognitionClient rekognition;
    private final AwsProperties properties;

    public FaceService(RekognitionClient rekognition, AwsProperties properties) {
        this.rekognition = rekognition;
        this.properties = properties;
    }

    public record Enrollment(String faceId, String collectionId) {}

    public record Match(String faceId, double similarity) {}

    public record LivenessResult(String status, double confidence, byte[] referenceImage) {}

    /** Rechaza fotos sin rostro usable antes de gastar una llamada de indexado. */
    public void assertUsableFace(byte[] image) {
        List<FaceDetail> faces = rekognition.detectFaces(request -> request
                .image(Image.builder().bytes(SdkBytes.fromByteArray(image)).build())
                .attributes(software.amazon.awssdk.services.rekognition.model.Attribute.DEFAULT)).faceDetails();

        if (faces.isEmpty()) {
            throw new IllegalArgumentException("No detectamos un rostro en la foto del documento.");
        }
        List<FaceDetail> bySize = faces.stream()
                .sorted(Comparator.comparingDouble(this::area).reversed())
                .toList();
        FaceDetail face = bySize.getFirst();
        if (bySize.size() > 1 && area(bySize.get(1)) > area(face) * SECONDARY_FACE_RATIO) {
            throw new IllegalArgumentException(
                    "La imagen tiene más de una persona. Fotografía solo el documento.");
        }
        if (face.confidence() < MIN_FACE_CONFIDENCE) {
            throw new IllegalArgumentException("El rostro no se distingue con claridad. Toma la foto de nuevo.");
        }
        if (face.quality().brightness() < MIN_BRIGHTNESS) {
            throw new IllegalArgumentException("La foto está muy oscura. Búscate un lugar con mejor luz.");
        }
        if (Math.abs(face.pose().yaw()) > MAX_ANGLE || Math.abs(face.pose().pitch()) > MAX_ANGLE) {
            throw new IllegalArgumentException("Encuadra el documento de frente, sin inclinarlo.");
        }
    }

    private double area(FaceDetail face) {
        return face.boundingBox().width() * face.boundingBox().height();
    }

    public Enrollment enroll(byte[] image, long userId) {
        String collection = properties.collection();
        var response = rekognition.indexFaces(request -> request
                .collectionId(collection)
                .image(Image.builder().bytes(SdkBytes.fromByteArray(image)).build())
                .externalImageId("user-" + userId)
                .maxFaces(1)
                .qualityFilter(QualityFilter.AUTO));

        if (response.faceRecords().isEmpty()) {
            String reason = response.unindexedFaces().stream()
                    .findFirst()
                    .map(UnindexedFace::reasonsAsStrings)
                    .map(reasons -> String.join(", ", reasons))
                    .orElse("calidad insuficiente");
            throw new IllegalArgumentException("No pudimos registrar tu rostro (" + reason + "). Sube una foto más nítida.");
        }
        return new Enrollment(response.faceRecords().getFirst().face().faceId(), collection);
    }

    public void forget(String collectionId, String faceId) {
        try {
            rekognition.deleteFaces(request -> request.collectionId(collectionId).faceIds(faceId));
        } catch (ResourceNotFoundException exception) {
            // La plantilla ya no existe en la colección: nada que borrar.
        }
    }

    public Optional<Match> search(byte[] image, float threshold) {
        var response = rekognition.searchFacesByImage(request -> request
                .collectionId(properties.collection())
                .image(Image.builder().bytes(SdkBytes.fromByteArray(image)).build())
                .faceMatchThreshold(threshold)
                .maxFaces(1));
        return response.faceMatches().stream()
                .findFirst()
                .map(match -> new Match(match.face().faceId(), match.similarity()));
    }

    /** Mayor parecido entre el rostro en vivo y los rostros del documento; 0 si no hay rostro comparable. */
    public double compare(byte[] liveFace, byte[] document) {
        try {
            return rekognition.compareFaces(request -> request
                            .sourceImage(Image.builder().bytes(SdkBytes.fromByteArray(liveFace)).build())
                            .targetImage(Image.builder().bytes(SdkBytes.fromByteArray(document)).build())
                            .similarityThreshold(0f))
                    .faceMatches().stream()
                    .mapToDouble(match -> match.similarity())
                    .max().orElse(0);
        } catch (InvalidParameterException exception) {
            // Rekognition responde así cuando alguna de las dos imágenes no tiene rostro.
            return 0;
        }
    }

    public String startLivenessSession() {
        return rekognition.createFaceLivenessSession(
                CreateFaceLivenessSessionRequest.builder().build()).sessionId();
    }

    public LivenessResult livenessResult(String sessionId) {
        var response = rekognition.getFaceLivenessSessionResults(request -> request.sessionId(sessionId));
        byte[] reference = response.referenceImage() == null || response.referenceImage().bytes() == null
                ? null : response.referenceImage().bytes().asByteArray();
        double confidence = response.confidence() == null ? 0 : response.confidence();
        return new LivenessResult(response.statusAsString(), confidence, reference);
    }
}
