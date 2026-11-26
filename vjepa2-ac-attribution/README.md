# 归因图、输入动作与原视频

打开 `index.html` 浏览全部案例，或查看 `index.csv`。

01–10 对应之前导出的10组片段；11 是报告中的 main_0000。

每个目录：`current_frame.png` / `context_overview.png` / `frames/*_update.png` / `frames/*_action.png` 都标明正在解释的当前动作和完整源视频路径。`original_video.mp4` 是完整原视频的副本；`source_clip.mp4/gif` 是输入四帧及真实后续；`attribution_clip.mp4/gif` 是标明同一动作的归因动画。

`ACTION_AND_VIDEO.md` 是人可读说明，`metadata.json` 保存完整精度动作与源文件信息，`actions.csv` 保存四步输入动作，`reader_maps.npz` 保存24层的原始正向图像归因分数。

动作是给 predictor 的条件输入，不是 predictor 生成的动作。当前动作解释的是最后一张输入帧到下一张采样帧的变化；四张图只是在显示各输入帧对这同一次预测的归因。平移 mm 和旋转 deg 是便于阅读的换算值；完整原始 m/rad 数值保存在 JSON/CSV。

这是已有实验结果的 CPU 可视化导出，没有重新运行模型或改变原始实验。


## Sources

Videos: DROID Dataset Team, https://droid-dataset.github.io/

Model: Meta FAIR V-JEPA 2-AC, https://github.com/facebookresearch/vjepa2

This public export uses portable video IDs. Internal server paths are not published.
