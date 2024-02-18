# This Dockerfile is specifically for apex-ast-serializer for the hosted version
# of the playground.
# It needs to be run in the context of the repository root, instead of the
# current directory
FROM eclipse-temurin:17.0.10_7-jdk-jammy as build
COPY . /prettier-plugin-apex
WORKDIR /prettier-plugin-apex/packages/apex-ast-serializer
RUN ./gradlew clean :server:installDist

FROM eclipse-temurin:17.0.10_7-jre-jammy
COPY --from=build /prettier-plugin-apex/packages/prettier-plugin-apex/vendor /opt
RUN echo /opt/apex-ast-serializer/bin/apex-ast-serializer-http -c '$CORS_HOST' -h 0.0.0.0 -p '$PORT' > /opt/apex-ast-serializer.sh
RUN chmod +x /opt/apex-ast-serializer.sh
CMD /opt/apex-ast-serializer.sh
