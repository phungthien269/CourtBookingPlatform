# Rollback Runbook

## Trigger

Rollback nếu có một trong các tín hiệu sau:

- webhook auto-confirm tạo booking sai trạng thái
- readiness check fail > 5 phút
- login hoặc payment lỗi diện rộng
- migration gây lỗi đọc/ghi production

## Steps

1. Disable frontend promotion trên Vercel, restore deployment trước đó.
2. Redeploy Railway API/worker về release trước.
3. Nếu migration gây lỗi:
   - stop write traffic
   - restore database từ snapshot gần nhất
   - replay manual payment reconciliation nếu cần
4. Verify:
   - `/api/health/live`
   - `/api/health/ready`
   - login
   - booking read path

## After rollback

- create incident note
- attach error logs / Sentry issue IDs
- freeze new deploys until root cause is confirmed

