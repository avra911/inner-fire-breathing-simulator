FROM ghcr.io/cirruslabs/android-sdk:36@sha256:f9b3ea9ed2b5fc9522adae82c7b4622ab7aa54207ef532c8e615a347dca08f31

ENV DEBIAN_FRONTEND=noninteractive \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    ANDROID_HOME=/opt/android-sdk-linux \
    ANDROID_SDK_ROOT=/opt/android-sdk-linux \
    ANDROID_NDK_HOME=/opt/android-sdk-linux/ndk/27.1.12297006

ENV PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg openjdk-17-jdk-headless \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses >/dev/null \
    && sdkmanager --sdk_root="$ANDROID_HOME" \
        "platforms;android-36" \
        "build-tools;35.0.0" \
        "build-tools;36.0.0" \
        "cmake;3.22.1" \
        "ndk;27.1.12297006" \
    && npm install --global eas-cli@25.3.0

ARG LOCAL_UID=1000
ARG LOCAL_GID=1000
RUN mkdir -p /home/builder/.gradle /home/builder/.npm /workspace /output \
    && chown -R "$LOCAL_UID:$LOCAL_GID" /home/builder /workspace /output

ENV HOME=/home/builder
WORKDIR /workspace
