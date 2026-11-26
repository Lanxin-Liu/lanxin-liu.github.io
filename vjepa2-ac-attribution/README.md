# Attribution maps, input actions, and source videos

Open `index.html` to browse the examples, or read `index.csv`.

Cases 01–10 are the ten selected clips. Case 11 is main_0000 from the report.

In each folder, `current_frame.png`, `context_overview.png`, `frames/*_update.png`, and `frames/*_action.png` label the current input action and source video. `original_video.mp4` is the full source video. `source_clip.mp4/gif` contains four observed inputs and one observed future. `attribution_clip.mp4/gif` shows attribution for the same final prediction, with the input action labeled.

`ACTION_AND_VIDEO.md` provides readable notes. `metadata.json` stores exact action values and source information. `actions.csv` stores all four input actions. `reader_maps.npz` stores the original positive image attribution scores for all 24 blocks.

The action is an input to the predictor, not its output. It applies from the current frame to the next sampled frame. The four displayed maps explain the same final prediction. The displayed mm and degree values are unit conversions. Original m/rad values are retained in JSON/CSV.

These figures were exported from completed experiments on CPU. The model was not rerun and the experimental results were not changed.


## Sources

Videos: DROID Dataset Team, https://droid-dataset.github.io/

Model: Meta FAIR V-JEPA 2-AC, https://github.com/facebookresearch/vjepa2

This public export uses portable video IDs. Internal server paths are not published.
