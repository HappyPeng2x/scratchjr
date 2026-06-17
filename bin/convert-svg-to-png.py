#!/usr/bin/env python3

import getopt
import os
import pysvg.parser
import shutil
from subprocess import Popen, PIPE
import sys

from subprocess import call

# Converts the svglibrary assets to png.
# This script depends on rsvg-convert (librsvg2-bin) or ImageMagick convert.

def main(argv):
    rsvgConvert = "/usr/bin/rsvg-convert"
    localRsvgConvert = "/usr/local/bin/rsvg-convert"
    imConvert = None
    for candidate in ["/usr/bin/convert", "/usr/local/bin/convert", shutil.which("convert")]:
        if candidate and os.path.isfile(candidate):
            imConvert = candidate
            break

    useRsvg = False
    if os.path.isfile(rsvgConvert):
        useRsvg = True
    elif os.path.isfile(localRsvgConvert):
        rsvgConvert = localRsvgConvert
        useRsvg = True

    if not useRsvg and imConvert is None:
        print('You must install librsvg2-bin or ImageMagick to build')
        sys.exit(1)

    if imConvert is None:
        print('You must install ImageMagick to build')
        sys.exit(1)

    svgDirectory = ''
    pngDirectory = ''

    try:
        opts, args = getopt.getopt(argv,"hi:o:",["input=","output="])
    except getopt.GetoptError:
        print('convert-svg-to-png.py -i <svgDirectory> -o <pngDirectory>')
        sys.exit(2)

    for opt, arg in opts:
        if opt == '-h':
            print('convert-svg-to-png.py -i <svgDirectory> -o <pngDirectory>')
            sys.exit()
        elif opt in ("-i", "--input"):
            svgDirectory = arg.lstrip()
        elif opt in ("-o", "--output"):
            pngDirectory = arg.lstrip()

    print('Input svg directory is ' + svgDirectory)
    print('Output png directory is ' + pngDirectory)

    MAX_WIDTH = 180
    MAX_HEIGHT = 140

    nullout = open(os.devnull,'wb')
    count = 0

    for i in os.listdir(svgDirectory):
        tokens = i.split(".")
        fname = tokens[0]
        pngname = fname + ".png"

        inputFile = svgDirectory + "/" + i
        outputFile = pngDirectory + "/" + pngname

        # Handle large PNGs and other files
        if tokens[-1] == "png":
            # Downscale with ImageMagick
            call([imConvert, inputFile, "-resize", '%ix%i' % (MAX_WIDTH, MAX_HEIGHT), outputFile])
            continue
        elif tokens[-1] != "svg":
            # Don't do any processing
            continue

        # Handle SVGs
        # hide stdout because pysvg.parser.parse spits out spurious warnings
        temp = sys.stdout
        sys.stdout = open(os.devnull, 'w')

        svg = pysvg.parser.parse(svgDirectory + i)
        sys.stdout = temp
        svgHeight = float(svg.get_height()[:-2])
        svgWidth = float(svg.get_width()[:-2])
        ratio = svgWidth / svgHeight

        heightBoundByWidth = MAX_WIDTH / ratio

        if useRsvg:
            if heightBoundByWidth > MAX_HEIGHT:
                call([rsvgConvert, "-h", str(MAX_HEIGHT), inputFile, "-o", outputFile])
            else:
                call([rsvgConvert, "-w", str(MAX_WIDTH), inputFile, "-o", outputFile])
        else:
            if heightBoundByWidth > MAX_HEIGHT:
                call([imConvert, "-background", "none", inputFile, "-resize",
                      'x%i' % MAX_HEIGHT, outputFile])
            else:
                call([imConvert, "-background", "none", inputFile, "-resize",
                      '%i' % MAX_WIDTH, outputFile])

        count = count + 1

    nullout.close()

    print('Converted {0} svgs to png'.format(count))

if __name__ == "__main__":
   main(sys.argv[1:])
