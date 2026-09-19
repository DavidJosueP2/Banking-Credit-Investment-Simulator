package com.edu.uta.backend.registration;

import java.time.LocalDate;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/public/registration")
public class RegistrationController {

    private final RegistrationService registration;

    public RegistrationController(RegistrationService registration) {
        this.registration = registration;
    }

    public record CreateAccount(@NotBlank(message = "Selecciona el tipo de documento") String idType,
                                @NotBlank(message = "Ingresa tu número de documento")
                                @Size(max = 20, message = "El documento es demasiado largo") String idNumber,
                                @NotBlank(message = "Ingresa tus nombres")
                                @Size(max = 80, message = "Los nombres son demasiado largos") String firstNames,
                                @NotBlank(message = "Ingresa tus apellidos")
                                @Size(max = 80, message = "Los apellidos son demasiado largos") String lastNames,
                                @NotNull(message = "Ingresa tu fecha de nacimiento") LocalDate birthDate,
                                @Size(max = 20, message = "El teléfono es demasiado largo") String phone,
                                @NotBlank(message = "Ingresa un usuario")
                                @Size(min = 4, max = 30, message = "El usuario debe tener entre 4 y 30 caracteres") String username,
                                @NotBlank(message = "Ingresa tu correo")
                                @Email(message = "El correo no es válido")
                                @Size(max = 254, message = "El correo es demasiado largo") String email,
                                @NotBlank(message = "Ingresa tu contraseña")
                                @Size(min = 12, message = "La contraseña debe tener al menos 12 caracteres") String password,
                                @AssertTrue(message = "Debes aceptar las políticas de privacidad")
                                boolean acceptedPolicies) {}

    public record VerifyEmail(@NotBlank(message = "Ingresa tu correo")
                              @Email(message = "El correo no es válido") String email,
                              @NotBlank(message = "Ingresa el código")
                              @Size(min = 6, max = 6, message = "El código debe tener 6 dígitos") String code) {}

    public record ResendCode(@NotBlank(message = "Ingresa tu correo")
                             @Email(message = "El correo no es válido") String email) {}

    @PostMapping
    public ResponseEntity<RegistrationService.PendingVerification> create(@Valid @RequestBody CreateAccount request) {
        var pending = registration.register(new RegistrationService.Registration(request.idType(),
                request.idNumber(), request.firstNames(), request.lastNames(), request.birthDate(),
                request.phone(), request.username(), request.email(), request.password()));
        return ResponseEntity.status(HttpStatus.CREATED).body(pending);
    }

    @PostMapping("/email/verify")
    public ResponseEntity<Void> verify(@Valid @RequestBody VerifyEmail request) {
        registration.verifyEmail(request.email(), request.code());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email/resend")
    public RegistrationService.PendingVerification resend(@Valid @RequestBody ResendCode request) {
        return registration.resend(request.email());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> rejected(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .filter(detail -> detail != null && !detail.isBlank())
                .findFirst()
                .orElse("Revisa los datos ingresados");
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> unreadable(HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", "Revisa los datos ingresados"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> conflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "El correo o el documento ya están registrados"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> missing(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
    }
}
