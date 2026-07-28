-- Built-in speaking scenarios every learner starts with.
--
-- Templates carry owner_id = null and target_language = 'any': the situation is
-- language-neutral, and the conversation route renders it in whichever language
-- the learner is studying. Inserted by the migration (which runs as the table
-- owner) because the insert policy requires owner_id = auth.uid(), so no client
-- can create a template.

insert into public.speaking_scenarios
  (owner_id, title, description, setting, ai_role, user_role, level, target_language, is_template)
values
  (null,
   'Ordering at a restaurant',
   'Order a meal, ask what a dish contains, and settle the bill.',
   'A busy neighbourhood restaurant at dinner time.',
   'A friendly server taking the order',
   'A customer eating out alone',
   'beginner', 'any', true),

  (null,
   'Job interview',
   'Introduce yourself, talk about your experience, and ask about the role.',
   'A meeting room at a mid-sized company.',
   'A hiring manager running a first-round interview',
   'A candidate applying for the job',
   'advanced', 'any', true),

  (null,
   'Casual chat with a friend',
   'Catch up on the weekend, weather, and plans for later.',
   'A cafe on a slow Saturday afternoon.',
   'A close friend you have not seen in a while',
   'Yourself, catching up',
   'beginner', 'any', true),

  (null,
   'Asking for directions',
   'You are lost. Ask how to reach the station and confirm you understood.',
   'A street corner in an unfamiliar part of the city.',
   'A local passer-by happy to help',
   'A visitor who has lost their way',
   'beginner', 'any', true),

  (null,
   'Checking into a hotel',
   'Give your booking details, ask about breakfast, and request a late checkout.',
   'The front desk of a small hotel, early evening.',
   'A receptionist handling check-in',
   'A guest arriving for a three-night stay',
   'intermediate', 'any', true),

  (null,
   'At the doctor',
   'Describe how you feel, answer questions, and understand the advice given.',
   'A GP surgery consulting room.',
   'A doctor examining a patient',
   'A patient who has felt unwell for a few days',
   'intermediate', 'any', true);
