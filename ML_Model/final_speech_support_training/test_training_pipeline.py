import unittest

import numpy as np
import pandas as pd

import train_final_speech_support_model_colab as trainer


class TrainingDataContractTests(unittest.TestCase):
    def valid_data(self):
        rows = []
        labels = ["low_support", "medium_support", "high_support"]
        for index in range(30):
            participant_number = index // 5
            rows.append(
                {
                    "session_id": f"session-{index:02d}",
                    "participant_code": f"participant-{participant_number}",
                    "speech_support_label": labels[index % len(labels)],
                    "total_attempts": index + 1,
                    "is_dummy_data": 0,
                }
            )
        return pd.DataFrame(rows)

    def test_rejects_missing_participant_code_column(self):
        data = self.valid_data().drop(columns="participant_code")

        with self.assertRaisesRegex(ValueError, "participant_code"):
            trainer.validate_training_data(data)

    def test_rejects_duplicate_session_ids(self):
        data = self.valid_data()
        data.loc[1, "session_id"] = data.loc[0, "session_id"]

        with self.assertRaisesRegex(ValueError, "Duplicate session_id"):
            trainer.validate_training_data(data)

    def test_rejects_any_dummy_rows(self):
        data = self.valid_data()
        data.loc[0, "is_dummy_data"] = 1

        with self.assertRaisesRegex(ValueError, "dummy"):
            trainer.validate_training_data(data)

    def test_rejects_fewer_than_two_support_labels(self):
        data = self.valid_data()
        data["speech_support_label"] = "low_support"

        with self.assertRaisesRegex(ValueError, "at least two support classes"):
            trainer.validate_training_data(data)

    def test_rejects_labels_outside_the_training_contract(self):
        data = self.valid_data()
        data.loc[0, "speech_support_label"] = "needs_review"

        with self.assertRaisesRegex(ValueError, "Unsupported speech_support_label"):
            trainer.validate_training_data(data)

    def test_rejects_a_split_with_participant_overlap(self):
        original_splitter = trainer.GroupShuffleSplit

        class OverlappingGroupShuffleSplit:
            def __init__(self, **_kwargs):
                pass

            def split(self, _x, _y, _groups):
                yield np.array([0, 1]), np.array([1, 2])

        trainer.GroupShuffleSplit = OverlappingGroupShuffleSplit
        try:
            with self.assertRaisesRegex(AssertionError, "Participant overlap"):
                trainer.split_by_participant(self.valid_data())
        finally:
            trainer.GroupShuffleSplit = original_splitter

    def test_splits_multi_session_participants_without_overlap(self):
        train_data, test_data = trainer.split_by_participant(self.valid_data())

        train_participants = set(train_data["participant_code"])
        test_participants = set(test_data["participant_code"])
        self.assertTrue(train_participants)
        self.assertTrue(test_participants)
        self.assertFalse(train_participants.intersection(test_participants))
        self.assertEqual(len(train_data) + len(test_data), 30)


if __name__ == "__main__":
    unittest.main()
