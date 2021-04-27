# morec
This is currently a set of web pages designed for manual annotation and classification of images.
They have all been developed for different projects over the course of a few months; therefore I assume similar tools may be useful in other projects.

The code needs much tidying before it can be called a software package.
Anyway, a skilled developer can already make use of many of the tools.

## /index.html
classification of a set of images.
Left and right side can be independently marked by one of four predefined classes.
The classification can be exported in JSON form (image -> [class_left, class_right]).

## kosti/index.html
line annotations over a set of images.
A set of lines can be defined on each image.
The lines can be exported in JSON form (image -> coordinates).
If a black and white image is supplied, the lines can be rendered on top of it.

## undistort
set of tools for automatic rectification of a subject on a chessboard grid.
This actually belongs to its own repository https://github.com/addam/rectify-checkerboard.
Will be cleaned up.
