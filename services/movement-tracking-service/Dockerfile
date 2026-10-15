FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/movement-tracking-service-*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
