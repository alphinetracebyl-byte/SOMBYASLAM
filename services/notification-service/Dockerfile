FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/notification-service-*.jar app.jar
EXPOSE 8090
ENTRYPOINT ["java","-jar","app.jar"]
