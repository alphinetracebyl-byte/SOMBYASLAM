FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/reporting-service-*.jar app.jar
EXPOSE 8091
ENTRYPOINT ["java", "-jar", "app.jar"]
