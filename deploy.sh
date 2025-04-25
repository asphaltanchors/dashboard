#!/bin/bash
cd /opt/dash || exit
git pull origin main
docker compose build
docker compose up -d
