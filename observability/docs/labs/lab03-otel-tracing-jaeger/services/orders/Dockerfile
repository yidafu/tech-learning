# orders 服务镜像（构建上下文为 lab 根目录，见 docker-compose.yml）
# 基础镜像 tag 以官方发布为准：https://hub.docker.com/_python（访问日期：2026-11-04）
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY services/orders/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/common/otel_setup.py services/common/wsgi_tracing.py services/common/http_client.py ./
COPY services/orders/app.py ./

EXPOSE 8001

CMD ["python", "app.py"]
