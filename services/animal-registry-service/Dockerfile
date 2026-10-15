# Stage 1 — Build
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

COPY pom.xml .
COPY ../pom.xml ../pom.xml
RUN mvn -B dependency:go-offline -q 2>/dev/null || true

COPY src ./src
RUN mvn -B -DskipTests package -q

# Stage 2 — Runtime (JRE-only, non-root)
FROM eclipse-temurin:21-jre-alpine AS runtime

RUN addgroup -S somlits && adduser -S somlits -G somlits

USER somlits
WORKDIR /app

COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1

ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
