 # ====== BUILD STAGE ======
 FROM maven:3.9-eclipse-temurin-11 AS build
 WORKDIR /workspace
 COPY pom.xml .
 RUN mvn -B -q -DskipTests dependency:go-offline
 COPY src ./src
 RUN mvn -B -DskipTests clean package

 # ====== RUNTIME STAGE ======
 FROM eclipse-temurin:11-jre
 WORKDIR /app
 ENV JAVA_OPTS="-Xms512m -Xmx2g"
 COPY --from=build /workspace/target/*.jar /app/app.jar
 EXPOSE 8080
 ENTRYPOINT ["/bin/sh","-c","java $JAVA_OPTS -jar /app/app.jar"]

