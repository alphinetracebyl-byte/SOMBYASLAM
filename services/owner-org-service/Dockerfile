FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/owner-org-service-*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java","-jar","app.jar"]
