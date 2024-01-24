# This Dockerfile is specifically for apex-ast-serializer for the hosted version
# of the playground
FROM eclipse-temurin:17.0.10_7-jre-jammy
COPY vendor/apex-ast-serializer/ /opt/apex-ast-serializer
RUN echo /opt/apex-ast-serializer/bin/apex-ast-serializer-http -c '$CORS_HOST' -h 0.0.0.0 -p '$PORT' > /opt/apex-ast-serializer.sh
RUN chmod +x /opt/apex-ast-serializer.sh
CMD /opt/apex-ast-serializer.sh
