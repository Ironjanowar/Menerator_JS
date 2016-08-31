#!/bin/bash

# Init elasticsearch
./elasticsearch-2.3.5/bin/elasticsearch &

# Esperar a que se inicie elasticsearch
echo "Esperando a que inicie elasticsearch"
sleep 7

# Start bot
echo "Starting bot"
node bot.js
