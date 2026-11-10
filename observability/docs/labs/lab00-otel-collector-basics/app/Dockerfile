# lab00 示例应用镜像
# 构建: podman build -t lab00-app:0.1.0 .（podman 完全兼容 Dockerfile 语法，
# 基础镜像 python:3.12-slim 与 docker.io 上的同名镜像一致）
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 先拷依赖清单再装依赖，充分利用构建缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# 以非 root 用户运行（安全基线；应用不落盘，无需额外权限）
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

CMD ["python", "app.py"]
