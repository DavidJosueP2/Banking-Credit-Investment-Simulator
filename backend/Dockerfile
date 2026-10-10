FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew
COPY src/main ./src/main
RUN ./gradlew --no-daemon bootJar

FROM eclipse-temurin:21-jre-jammy
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/build/libs/backend.jar ./backend.jar
USER app
ENV SPRING_PROFILES_ACTIVE=prod TZ=America/Guayaquil
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/backend.jar"]
