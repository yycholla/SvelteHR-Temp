{{/*
Expand the name of the chart.
*/}}
{{- define "sveltehr.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "sveltehr.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "sveltehr.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sveltehr.labels" -}}
helm.sh/chart: {{ include "sveltehr.chart" . }}
{{ include "sveltehr.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "sveltehr.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sveltehr.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "sveltehr.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "sveltehr.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL connection string
*/}}
{{- define "sveltehr.postgresqlConnectionString" -}}
{{- $host := .Values.postgresql.service.name | default (printf "%s-postgres-rw" (include "sveltehr.fullname" .)) }}
{{- $port := .Values.postgresql.service.port | default "5432" }}
{{- $database := .Values.postgresql.database }}
{{- $username := .Values.postgresql.username }}
{{- printf "postgresql://%s:${DB_PASSWORD}@%s:%s/%s" $username $host $port $database }}
{{- end }}

{{/*
Redis connection URL
*/}}
{{- define "sveltehr.redisUrl" -}}
{{- if .Values.redis.url }}
{{- .Values.redis.url }}
{{- else if eq .Values.redis.architecture "standalone" }}
{{- $host := printf "%s-redis-master" (include "sveltehr.fullname" .) }}
{{- printf "redis://%s:6379" $host }}
{{- else }}
{{- $host := printf "%s-redis" (include "sveltehr.fullname" .) }}
{{- printf "redis://%s:6379" $host }}
{{- end }}
{{- end }}

{{/*
Backend service URL
*/}}
{{- define "sveltehr.backendUrl" -}}
{{- $name := include "sveltehr.fullname" . }}
{{- $port := .Values.backend.service.port | default 4000 }}
{{- printf "http://%s-backend:%d" $name $port }}
{{- end }}

{{/*
Frontend service URL
*/}}
{{- define "sveltehr.frontendUrl" -}}
{{- $name := include "sveltehr.fullname" . }}
{{- $port := .Values.frontend.service.port | default 5173 }}
{{- printf "http://%s-frontend:%d" $name $port }}
{{- end }}

{{/*
Container security context
*/}}
{{- define "sveltehr.containerSecurityContext" -}}
allowPrivilegeEscalation: false
runAsNonRoot: true
runAsUser: 1001
capabilities:
  drop:
    - ALL
{{- end }}

{{/*
Pod security context
*/}}
{{- define "sveltehr.podSecurityContext" -}}
fsGroup: 1001
{{- end }}

{{/*
Standard resource limits
*/}}
{{- define "sveltehr.resources" -}}
{{- if . }}
{{- toYaml . }}
{{- else }}
requests:
  memory: 128Mi
  cpu: 100m
limits:
  memory: 256Mi
  cpu: 200m
{{- end }}
{{- end }}

{{/*
Database wait init container
*/}}
{{- define "sveltehr.waitForPostgresql" -}}
- name: wait-for-postgres
  image: postgres:15-alpine
  command:
    - sh
    - -c
    - |
      echo "Waiting for PostgreSQL to be ready..."
      until pg_isready -h {{ .Values.postgresql.service.name | default (printf "%s-postgres-rw" (include "sveltehr.fullname" .)) }} -p {{ .Values.postgresql.service.port | default "5432" }} -U {{ .Values.postgresql.username }}; do
        echo "  PostgreSQL is unavailable - sleeping 2s"
        sleep 2
      done
      echo "PostgreSQL is ready!"
  env:
    - name: PGPASSWORD
      valueFrom:
        secretKeyRef:
          name: {{ include "sveltehr.fullname" . }}-postgres-app-secret
          key: password
{{- end }}

{{/*
Backend wait init container
*/}}
{{- define "sveltehr.waitForBackend" -}}
- name: wait-for-backend
  image: curlimages/curl:latest
  command:
    - sh
    - -c
    - |
      echo "Waiting for backend API to be ready..."
      until curl -sf {{ include "sveltehr.backendUrl" . }}/health; do
        echo "  Backend API is unavailable - sleeping 2s"
        sleep 2
      done
      echo "Backend API is ready!"
{{- end }}

{{/*
Image pull policy helper
*/}}
{{- define "sveltehr.imagePullPolicy" -}}
{{- if eq .Values.global.environment "development" }}
Always
{{- else }}
IfNotPresent
{{- end }}
{{- end }}

{{/*
Environment name helper
*/}}
{{- define "sveltehr.environmentName" -}}
{{- .Values.global.environment | default "development" }}
{{- end }}

{{/*
Is production environment
*/}}
{{- define "sveltehr.isProduction" -}}
{{- eq (include "sveltehr.environmentName" .) "production" }}
{{- end }}

{{/*
Common environment variables
*/}}
{{- define "sveltehr.commonEnv" -}}
- name: ENVIRONMENT
  value: {{ include "sveltehr.environmentName" . }}
- name: LOG_LEVEL
  value: {{ .Values.global.environment | eq "production" | ternary "info" "debug" }}
- name: TZ
  value: "UTC"
{{- end }}

{{/*
Monitoring labels
*/}}
{{- define "sveltehr.monitoringLabels" -}}
{{- if .Values.monitoring.enabled }}
prometheus.io/scrape: "true"
prometheus.io/port: "{{ .port }}"
prometheus.io/path: "/metrics"
{{- end }}
{{- end }}

{{/*
Anti-affinity rules for HA
*/}}
{{- define "sveltehr.podAntiAffinity" -}}
{{- if and (eq (include "sveltehr.isProduction" .) "true") (gt (.replicaCount | int) 1) }}
podAntiAffinity:
  preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
            - key: app.kubernetes.io/component
              operator: In
              values:
                - {{ .component }}
        topologyKey: kubernetes.io/hostname
{{- end }}
{{- end }}

{{/*
Rolling update strategy
*/}}
{{- define "sveltehr.rollingUpdateStrategy" -}}
type: RollingUpdate
rollingUpdate:
  maxSurge: 1
  {{- if eq (include "sveltehr.isProduction" .) "true" }}
  maxUnavailable: 0
  {{- else }}
  maxUnavailable: 1
  {{- end }}
{{- end }}

{{/*
Standard probe configuration
*/}}
{{- define "sveltehr.standardProbe" -}}
{{- $probe := . -}}
httpGet:
  path: {{ $probe.path | default "/" }}
  port: {{ $probe.port }}
initialDelaySeconds: {{ $probe.initialDelaySeconds | default 30 }}
periodSeconds: {{ $probe.periodSeconds | default 10 }}
timeoutSeconds: {{ $probe.timeoutSeconds | default 5 }}
failureThreshold: {{ $probe.failureThreshold | default 3 }}
{{- end }}
