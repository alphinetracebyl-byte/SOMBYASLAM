package com.somlits.identityaccess.api;

import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.somlits.identityaccess.TestcontainersConfig;
import com.somlits.identityaccess.infrastructure.keycloak.KeycloakUserService;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.notNullValue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class AuthApiTest {

    @LocalServerPort int port;
    @MockBean KeycloakUserService keycloakService;
    @MockBean ServiceBusSenderClient serviceBusSenderClient;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
    }

    @Test
    void register_withValidPhone_returns201WithUserId() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                    {"phoneE164":"+252612888001","fullName":"Test User One"}
                    """)
        .when()
            .post("/internal/v1/auth/register")
        .then()
            .statusCode(HttpStatus.CREATED.value())
            .body("userId", notNullValue())
            .body("phoneLast4", org.hamcrest.Matchers.equalTo("8001"));
    }

    @Test
    void register_withInvalidPhone_returns422() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                    {"phoneE164":"12345","fullName":"Bad Phone"}
                    """)
        .when()
            .post("/internal/v1/auth/register")
        .then()
            .statusCode(HttpStatus.BAD_REQUEST.value())
            .contentType("application/problem+json");
    }

    @Test
    void register_duplicatePhone_returns409() {
        String body = """
                {"phoneE164":"+252612888002","fullName":"Dup User"}
                """;
        given().contentType(ContentType.JSON).body(body)
                .post("/internal/v1/auth/register").then().statusCode(201);

        given().contentType(ContentType.JSON).body(body)
                .post("/internal/v1/auth/register")
                .then().statusCode(409);
    }

    @Test
    void forgotPassword_forUnknownPhone_returns422() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                    {"phoneE164":"+252699000000"}
                    """)
        .when()
            .post("/internal/v1/auth/forgot-password")
        .then()
            .statusCode(HttpStatus.UNPROCESSABLE_ENTITY.value());
    }

    @Test
    void healthEndpoint_isPublicAndReturnsUp() {
        given()
            .get("/actuator/health")
        .then()
            .statusCode(200)
            .body("status", org.hamcrest.Matchers.equalTo("UP"));
    }
}
