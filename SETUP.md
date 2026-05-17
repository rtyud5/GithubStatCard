# github-stats-card

Self-hosted GitHub stats card — no rate limits, dark theme, SVG output.

## Setup

### 1. Tạo GitHub Personal Access Token

1. Vào https://github.com/settings/tokens/new
2. Note: `github-stats-card`
3. Expiration: No expiration (hoặc tuỳ)
4. Scope: chỉ tick **`read:user`** và **`repo`** (public repos)
5. Click **Generate token** → copy token lại

### 2. Deploy lên Vercel

```bash
# Clone hoặc upload folder này lên GitHub repo mới
# Sau đó vào vercel.com → New Project → import repo đó
```

Hoặc dùng Vercel CLI:

```bash
npm i -g vercel
vercel
```

### 3. Thêm Environment Variables trên Vercel

Vào **Project Settings → Environment Variables**, thêm:

| Key | Value |
|-----|-------|
| `GITHUB_TOKEN` | token vừa tạo ở bước 1 |
| `GITHUB_USERNAME` | `rtyud5` |

Sau đó **Redeploy** để áp dụng.

### 4. Dán vào README

Sau khi deploy xong, Vercel sẽ cho bạn một URL dạng:

```
https://your-project.vercel.app/api/stats
```

Dán vào README như sau:

```markdown
![GitHub Stats](https://your-project.vercel.app/api/stats)
```

Hoặc có link về GitHub profile:

```markdown
[![GitHub Stats](https://your-project.vercel.app/api/stats)](https://github.com/rtyud5)
```

## Notes

- SVG được cache 1 giờ (`Cache-Control: s-maxage=3600`) — không bị rate limit
- Grade tính dựa trên stars, commits, PRs, issues, contributed repos
- Có thể truyền username động: `/api/stats?username=abc`
