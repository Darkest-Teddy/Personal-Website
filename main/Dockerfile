FROM node:20-alpine
WORKDIR /app

# Vite inlines these at build time. Railway passes matching service variables in as
# build args, so declare them as ARG then promote to ENV before "npm run build".
# Without this the guestbook (Supabase) and contact form (Web3Forms) build "offline".
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_WEB3FORMS_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_WEB3FORMS_KEY=$VITE_WEB3FORMS_KEY

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD npx vite preview --host 0.0.0.0 --port ${PORT:-3000}
