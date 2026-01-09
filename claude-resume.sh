#!/bin/bash

# Define the desired time to resume (e.g., 08:00 AM)
RESUME_TIME="00:01"

# Define the message to send to Claude
CONTINUE_MESSAGE="Please continue with the previous task."

# Schedule the command to run at the specified time
echo "claude --continue \"$CONTINUE_MESSAGE\"" | at $RESUME_TIME

