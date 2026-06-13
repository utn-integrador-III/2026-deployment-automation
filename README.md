# Deploying containers to Fly.io — a hands-on demo

A tiny, **working** example that deploys a backend API and a frontend to the cloud,
both as Docker containers, on [Fly.io](https://fly.io). The code is deliberately
minimal so you can focus on the one thing this repo teaches: **how to ship a
container to the cloud for the first time.**

By the end you'll have two live URLs:

```
  Browser ──▶ https://your-frontend.fly.dev   (nginx serving a static page)
                      │  fetch()
                      ▼
              https://your-backend.fly.dev    (Node/Express API)
```

Two separate Fly apps, two containers, talking to each other over HTTPS.

---

## What's in here

```
fly-deploy-demo/
├── backend/
│   ├── server.js        # ~30-line Express API: /api/health and /api/hello
│   ├── package.json
│   ├── Dockerfile       # multi-stage, slim, non-root
│   ├── .dockerignore
│   └── fly.toml         # Fly config (commented so you can read every field)
├── frontend/
│   ├── index.html       # one file: checks the backend and shows the result
│   ├── nginx.conf
│   ├── Dockerfile       # nginx serving the static file
│   ├── .dockerignore
│   └── fly.toml
└── README.md            # you are here
```

You do **not** need to install Docker locally. Fly builds the image for you on its
own remote builder. You only need the Fly CLI.

---

## Prerequisites

1. A Fly.io account → sign up at <https://fly.io/app/sign-up>.
   Fly asks for a payment method even for small apps. This demo is built to **scale
   to zero when idle** and you'll **destroy it at the end**, so cost stays near nothing.
   Check current pricing at <https://fly.io/docs/about/pricing/> before you start.
2. The Fly CLI (`flyctl`, invoked as `fly`). Install it below.

### Install the Fly CLI

**macOS / Linux**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell)**
```powershell
powershell -Command "iwr https://fly.io/install.sh -useb | iex"
```

**macOS with Homebrew (alternative)**
```bash
brew install flyctl
```

Confirm it's installed:
```bash
fly version
```

### Log in
```bash
fly auth signup   # first time — opens the browser to create your account
# or, if you already have an account:
fly auth login
```

---

## The two ways to deploy

You asked for options — here are the two you'll actually use. Pick one and stick with
it; they produce the same result.

| | **Option A — `fly launch`** | **Option B — `fly deploy`** |
|---|---|---|
| Best for | Your very first deploy | When config already exists |
| What it does | Detects your Dockerfile, asks you a few questions, **generates `fly.toml`**, and deploys | Reads the existing `fly.toml` + Dockerfile and just deploys |
| You control the config? | Fly writes it for you | You edit it by hand (this repo gives you one) |

This repo already includes a `fly.toml` for each app, so **Option B is the quickest
path here.** Option A is shown so you understand where that file comes from.

---

## Deploy step by step

> Throughout, replace `CHANGE-ME` / `your-name` with something unique to you.
> App names are **global** across all of Fly, so `fly-demo-backend` is probably taken —
> use `fly-demo-backend-myapp` or similar.

### Step 1 — Deploy the backend

```bash
cd backend
```

**Option A (let Fly generate the config):**
```bash
fly launch --no-deploy
```
It will ask for an app name and a region. Pick a region near you with
`fly platform regions` first — from Costa Rica, `mia` (Miami), `qro` (Querétaro) or
`bog` (Bogotá) are the closest. Say **No** to databases/Redis (we don't need them).
This overwrites `fly.toml` with Fly's version. Then deploy:
```bash
fly deploy
```

**Option B (use the config in this repo):**
Open `fly.toml`, change the `app = "..."` line to your unique name, then:
```bash
fly deploy
```

When it finishes you'll see a URL like `https://fly-demo-backend-sergio.fly.dev`.
Test it:
```bash
curl https://fly-demo-backend-myapp.fly.dev/api/hello
```
You should get back JSON with a `message` and a `region`. **Copy this backend URL** —
the frontend needs it.

### Step 2 — Point the frontend at the backend

Edit `frontend/index.html` and change this line near the bottom to your backend URL:
```js
const BACKEND_URL = "https://fly-demo-backend-myapp.fly.dev";
```
(You can skip this and just paste the URL into the field on the page, but setting it
here means it works automatically.)

### Step 3 — Deploy the frontend

```bash
cd ../frontend
```
Change the `app = "..."` line in `frontend/fly.toml` to a unique name, then:
```bash
fly deploy
```
Open it in your browser:
```bash
fly open
```
You should see a status panel that turns **green / "Backend online"** and prints the
JSON the API returned. That green light means container #1 (frontend) successfully
reached container #2 (backend) across the public internet. Done. 🎈

---

## Verify everything

```bash
fly status              # is the app running? how many machines?
fly logs                # live logs (great for debugging a failed start)
fly open                # open the app in a browser
```

Run these from inside `backend/` or `frontend/`, or add `-a <app-name>` from anywhere.

---

## Things you'll want to do next

### View live logs
```bash
fly logs -a fly-demo-backend-myapp
```

### Set an environment variable / secret
Public config can go in `fly.toml`:
```toml
[env]
  GREETING = "hola"
```
Sensitive values (API keys, DB passwords) go in **secrets** — encrypted, never in git:
```bash
fly secrets set DATABASE_URL="postgres://..." -a fly-demo-backend-sergio
```
Setting a secret triggers a new deploy automatically.

### Scale up / down
```bash
fly scale count 2                 # run 2 machines (high availability)
fly scale memory 512              # bump RAM to 512 MB
fly scale show                    # see current sizing
```

### Add a second region (run closer to more users)
```bash
fly scale count 2 --region mia,bog
```

### SSH into the running container
```bash
fly ssh console -a fly-demo-backend-sergio
```

### Add a custom domain
```bash
fly certs add api.yourdomain.com -a fly-demo-backend-sergio
# then add the DNS records Fly tells you to add
```

---

## How the deploy actually works (the 60-second mental model)

1. `fly deploy` reads **`fly.toml`** to learn your app name, region, port, and checks.
2. It sends your code to a **remote builder**, which runs your **`Dockerfile`** to build
   an image. (This is why you don't need Docker installed locally.)
3. The image is pushed to Fly's registry and booted as one or more **Machines** (fast
   micro-VMs running your container).
4. Fly puts your app behind a global proxy and gives it `https://<app>.fly.dev` with a
   TLS certificate, mapping public **443** to your container's **`internal_port`** (8080).
5. The health check (`/api/health`, `/health`) tells Fly whether the machine is healthy;
   `auto_stop_machines` + `min_machines_running = 0` let it **sleep when idle** and wake
   on the next request.

The single most common mistake: your app must listen on `0.0.0.0` at the port in
`internal_port`, **not** `127.0.0.1`. Localhost-only binding is the #1 reason a deploy
"succeeds" but the URL won't load.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Error: app name ... is not available` | Name is taken globally. Pick a more unique one. |
| URL loads forever / 502 | App not listening on `0.0.0.0:8080`, or `internal_port` in `fly.toml` doesn't match the port your app uses. |
| Frontend shows red "Cannot reach backend" | `BACKEND_URL` is wrong, or backend isn't deployed. Test the backend URL with `curl .../api/hello`. |
| Browser console: CORS error | Backend must send `Access-Control-Allow-Origin` (this demo already does in `server.js`). |
| Deploy fails during build | Run `fly logs` and read the build output. Usually a Dockerfile typo or a missing file excluded by `.dockerignore`. |
| Machine keeps restarting | Health check failing. Confirm the `path` in `fly.toml` returns HTTP 200. |

---

## Clean up (do this to stop any charges)

```bash
fly apps destroy fly-demo-backend-sergio
fly apps destroy fly-demo-frontend-sergio
```
This permanently deletes the apps and their machines.

---

## Appendix — using your own stack instead of Node

The deployment steps above are identical for any language; only the `Dockerfile`
changes. Since you work in Spring Boot, here's the backend `Dockerfile` you'd swap in —
a multi-stage build that compiles the JAR and runs it on a slim JRE. Keep the same
`fly.toml` (just make sure `internal_port` matches `server.port`, e.g. 8080):

```dockerfile
# ---- build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline       # cache deps
COPY src ./src
RUN mvn -q clean package -DskipTests

# ---- run ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

In `application.properties`, make Spring listen on Fly's port:
```properties
server.port=${PORT:8080}
server.address=0.0.0.0
```
Then it's the same `fly launch` / `fly deploy` flow. The same idea applies to a
Vite/React frontend: build the static files in one stage and copy them into the nginx
image, instead of copying a single `index.html`.

---

### Quick command reference

```bash
fly auth login                 # log in
fly launch --no-deploy         # generate fly.toml (first time)
fly deploy                     # build + ship
fly status                     # health & machines
fly logs                       # live logs
fly open                       # open in browser
fly secrets set KEY=value      # add an encrypted env var
fly scale count 2              # run more machines
fly ssh console                # shell into the container
fly apps destroy <name>        # delete the app
```

Happy shipping. 🎈
