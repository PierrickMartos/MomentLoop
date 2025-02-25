#!/bin/bash

# Script to watch for .mov files created in the last minute
# and convert them to optimized .mp4 files for Android 10-inch tablet

# Set the directory to watch (change this to your video source directory)
WATCH_DIR="/Volumes/MomentLoop"

# Set output directory for converted files (change this to your desired output location)
OUTPUT_DIR="/Volumes/MomentLoop"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Log file
LOG_FILE="$(dirname "$0")/conversion_log.txt"

# Function to log messages
log() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" >> "$LOG_FILE"
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1"
}

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    log "Error: ffmpeg is not installed. Please install it with: brew install ffmpeg"
    exit 1
fi

log "Starting MOV to MP4 conversion process..."

# Find .mov files created in the last minute
find "$WATCH_DIR" -name "*.mov" -type f -mmin -1 | while read -r file; do
    # Get the filename without path and extension
    filename=$(basename "$file" .mov)
    output_file="$OUTPUT_DIR/${filename}.mp4"

    # Check if the output file already exists
    if [ -f "$output_file" ]; then
        log "Output file $output_file already exists. Skipping."
        continue
    fi

    # Check if the file is still being written to
    if lsof "$file" >/dev/null 2>&1; then
        log "File $file is still being written. Skipping for now."
        continue
    fi

    log "Converting $file to $output_file"

    # Convert to mp4 with settings optimized for Android 10-inch tablet
    # - Resolution: 1280x720 (HD ready) for good balance of quality and file size
    # - Video codec: h264 with CRF 26 (lower = better quality, 18-28 is normal range)
    # - Preset: medium (balance between encoding speed and compression efficiency)
    # - Audio: MP3 at 128kbps for good quality audio
    # - faststart flag for better streaming

    ffmpeg -i "$file" \
          -vf "scale='trunc(oh*a/2)*2:720,format=yuv420p,colorspace=all=bt709'" \
          -c:v libx264 \
          -crf 23 \
          -preset medium \
          -profile:v main \
          -level 4.0 \
          -color_primaries bt709 \
          -color_trc bt709 \
          -colorspace bt709 \
          -color_range tv \
          -c:a aac \
          -b:a 128k \
          -movflags +faststart \
          "$output_file" -y 2>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        log "Successfully converted $file to $output_file"
        # Calculate size reduction
        original_size=$(du -h "$file" | cut -f1)
        converted_size=$(du -h "$output_file" | cut -f1)
        log "Size reduced from $original_size to $converted_size"

        # Uncomment to delete original file after successful conversion
        # rm "$file"
    else
        log "Failed to convert $file"
        log "You may need to install additional codec support on your Synology."
        log "Try installing ffmpeg from SynoCommunity package source."
    fi
done

log "Conversion process completed"

# Note: To run this script automatically every minute, add to crontab:
# * * * * * /path/to/server-scripts/convert-mov-to-mp4.sh
