#!/bin/bash
cd /opt/apps/dash || exit
git pull origin main
docker compose build
docker compose up -d
