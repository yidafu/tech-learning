# Lab04 示例应用：FastAPI + OpenTelemetry SDK（web / inventory 两个角色共用此镜像）
FROM python:3.12-slim

WORKDIR /app

# 先装依赖（利用镜像层缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 默认 web 角色（:8000）；inventory 角色由 compose 覆盖 command 端口
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
