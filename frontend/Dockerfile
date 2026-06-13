# Static site served by nginx. No build step needed for this demo.
FROM nginx:1.27-alpine

# Replace the default site config with ours (listens on 8080, adds /health).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the static files.
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 8080
# nginx:alpine already runs the right CMD; nothing else to add.
