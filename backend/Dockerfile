FROM golang:1.24-alpine AS builder

# Install build dependencies for CGO (SQLite compiled driver)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN CGO_ENABLED=1 GOOS=linux go build -o neocheck .

FROM alpine:latest  

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app/

# Copy binary from builder
COPY --from=builder /app/neocheck .

# Expose default port
EXPOSE 8080

CMD ["./neocheck"]
