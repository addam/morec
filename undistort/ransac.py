import numpy as np
import cv2
from sys import argv
import matplotlib.pyplot as plt

def quadric(shape, conic):
  a, b, c, d, e, f = conic
  x, y = np.mgrid[:shape[0], :shape[1]]
  return (a*x + c*y + d)*x + (b*y + e)*y + f

fname = argv[1]
img = cv2.imread(fname)
img = cv2.pyrDown(cv2.pyrDown(img[:,:,0]))
mask = quadric(img.shape, (0.001, 0.001, 0, -0.002, -0.001, -4))
diff = np.abs(mask - img) * 1e-5
cv2.imshow("diff", diff)
while cv2.waitKey(0) != 27:
  pass
exit()
mask = lab_segmentation(img)
mask = largest_component(mask)
mask *= 255
if len(argv) > 2:
  cv2.imwrite(argv[2], mask)
else:
  cv2.imshow("mask", mask)
  cv2.waitKey(0)

#mask, bgm, fgm = cv2.grabCut(img, None, (326, 220, 333, 428), np.zeros((1, 65),np.float64), np.zeros((1, 65),np.float64), 50, cv2.GC_INIT_WITH_RECT)

# count = np.zeros((256, 256), np.float32)
# for row in img:
  # for l, a, b in row:
    # count[a, b] += 1
# cv2.imshow("count", np.log(count + 1) / 8)
# plt.scatter(img[...,0], img[...,1])
# plt.show()

# img[...,0] = 0
# cv2.imshow('img', img)
# cv2.imshow('mask', 64*mask)
# cv2.waitKey(0)
