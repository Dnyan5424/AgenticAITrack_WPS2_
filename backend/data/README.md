# Job-role dataset

`job_titles_and_descriptions.csv` is from [Donphilip/job_titles_and_descriptions](https://huggingface.co/datasets/Donphilip/job_titles_and_descriptions), pinned to dataset revision `6605240da9a5923036c2cb8a523b1c651c135f2f`.

The dataset is provided under the MIT License. Its source repository describes the columns as job title, skills, and job description. SkillProof uses the records as a role-matching catalog; it does not treat them as live vacancies or labeled student outcomes.

Role ranking combines verified-skill coverage (80%) with TF-IDF cosine similarity between repository evidence text and each role description (20%). The score is an explainable heuristic, not a hiring prediction.
