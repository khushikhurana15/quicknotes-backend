# tts_script.py
from gtts import gTTS
import sys
import os

if __name__ == "__main__":
    # Check if enough command-line arguments are provided.
    # sys.argv[0] is the script name itself.
    # sys.argv[1] should be the text to convert.
    # sys.argv[2] should be the output file path.
    if len(sys.argv) < 3:
        # If not enough arguments, exit with an error code (1).
        # This signals to the Node.js process that something went wrong.
        sys.exit(1)

    # Extract the text and output path from the command-line arguments.
    text_to_convert = sys.argv[1]
    output_path = sys.argv[2]

    try:
        # Create a gTTS object.
        # 'text' is the string to convert.
        # 'lang' specifies the language (e.g., 'en' for English). You can change this if your notes are in a different language.
        tts = gTTS(text=text_to_convert, lang='en')

        # Save the generated speech to the specified output file path.
        tts.save(output_path)

        # Exit with a success code (0).
        # This signals to the Node.js process that the conversion was successful.
        sys.exit(0)
    except Exception as e:
        # If any error occurs during the gTTS process, print it to standard error.
        # Node.js can capture this stderr output to log the error.
        print(f"Error in gTTS: {e}", file=sys.stderr)
        # Exit with an error code (1) to indicate failure.
        sys.exit(1)