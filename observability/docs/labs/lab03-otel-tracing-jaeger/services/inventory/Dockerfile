# inventory 服务镜像（构建上下文为 lab 根目录，见 docker-compose.yml）
# 基础镜像 tag 以官方发布为准：https://hub.docker.com/_python（访问日期：2026-11-04）
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY services/inventory/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# inventory 不发出站调用（不用 http_client），一并拷贝是为了三个 Dockerfile 保持一致
COPY services/common/otel_setup.py services/common/wsgi_tracing.py services/common/http_client.py ./
COPY services/inventory/app.py ./

EXPOSE 8002

CMD ["python", "app.py"]
