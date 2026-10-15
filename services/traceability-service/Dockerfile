FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/traceability-service-*.jar app.jar
EXPOSE 8092
ENTRYPOINT ["java", "-jar", "app.jar"]
