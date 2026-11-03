FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY src/ src/
RUN mkdir -p build/classes && javac --release 21 --add-modules jdk.httpserver -encoding UTF-8 -d build/classes src/arena/*.java

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/classes/ build/classes/
COPY lib/ lib/
COPY web/ web/
ENV HOST=0.0.0.0 PORT=8080 COOKIE_SECURE=true REQUIRE_POSTGRES=true
USER 10001:10001
EXPOSE 8080
CMD ["java", "--add-modules", "jdk.httpserver", "-XX:MaxRAMPercentage=70", "-cp", "build/classes:lib/*", "arena.WebServer"]
