import numpy as np
import cv2
from sys import argv
import matplotlib.pyplot as plt

def lab_segmentation(img):
  img = np.float32(img)/255
  img = cv2.GaussianBlur(img, (11, 11), 5)
  img = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[...,1]
  mask = np.uint8(img > np.quantile(img, 0.9))
  return mask

def largest_component(mask):
  retval, labels, stats, centroids = cv2.connectedComponentsWithStats(mask)
  index = np.argmax(stats[1:,4])
  mask = np.uint8(labels == index + 1)
  return mask

def ccorr_segmentation(img):
  img = np.float32(img) / 255
  # ccorr = np.fft.rfftn(img[...,2], (2048, 2048))
  # ccorr
  # ccorr = np.fft.irfftn(ccorr, (2048, 2048))
  size = 800
  ccorr = cv2.matchTemplate(img, img[:-size, :-size], cv2.TM_CCORR)
  ccorr = cv2.GaussianBlur(ccorr, (11, 11), 5)
  # cv2.imshow("ccorr1", ccorr / 5e6)
  kernel = np.uint8(((1,1,1), (1,0,1), (1,1,1)))
  indices = np.nonzero((ccorr > cv2.dilate(ccorr, kernel)) & (ccorr > 2e6))
  mask = np.zeros((*img.shape[:2], 2*len(indices[0])), np.float32)
  for i, (y, x) in enumerate(zip(*indices)):
    if 0 < y < size and 0 < x < size:
        mask[y:, x:, 2*i] = np.sum(np.abs(img[:-y, :-x] - img[y:, x:]), axis=2)
        mask[:-y, :-x, 2*i+1] = np.sum(np.abs(img[:-y, :-x] - img[y:, x:]), axis=2)
  return mask

def draw_stats(event, x, y, flags, mask):
  if event != cv2.EVENT_LBUTTONDOWN:
    return
  fig, ax = plt.subplots()
  ax.ylim = 0, 0.2
  ax.plot(sorted(mask[y,x]))
  plt.show()

fname = argv[1]
img = cv2.imread(fname)
mask = ccorr_segmentation(img)
diff = np.sum(mask>0.2, axis=2) / np.sum(mask > 0, axis=2)
cv2.imshow("diff", diff)
cv2.setMouseCallback("diff", draw_stats, mask)
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
