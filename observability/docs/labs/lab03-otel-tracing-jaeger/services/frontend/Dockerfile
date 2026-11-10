# frontend 服务镜像（构建上下文为 lab 根目录，见 docker-compose.yml）
# 基础镜像 tag 以官方发布为准：https://hub.docker.com/_python（访问日期：2026-11-04）
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

# 先只拷贝依赖清单再安装，充分利用镜像层缓存
COPY services/frontend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 共享的 OTel 引导模块 + 本服务代码（COPY 会把多文件平铺到 /app，import 路径保持简单）
COPY services/common/otel_setup.py services/common/wsgi_tracing.py services/common/http_client.py ./
COPY services/frontend/app.py ./

EXPOSE 8000

CMD ["python", "app.py"]
