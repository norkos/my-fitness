# My Fitness

**Your gym notebook, on your phone. Bring your trainer's plan to the gym, log what you actually lifted, and see whether you are getting stronger.**

Most people who train regularly hit the same wall: standing at the bench, trying to remember whether last week was 50 kg for 8 or 52.5 kg for 6. Paper notebooks get lost, spreadsheets are painful on a phone, and the big fitness apps bury a simple log under social feeds, subscriptions and plans you never asked for.

My Fitness keeps it simple: plan the session (or import your trainer's plan), follow it in the gym, record what you really did, and see how you are progressing. It is a small private web app you host yourself, built for one person and designed to be used one-handed on a phone between sets.

## What it does today

### Log a workout in under a minute
- Record a session with its date (today by default), whether you trained **solo or with a trainer**, and any number of exercises and sets.
- **Last time's numbers are already there.** When you add an exercise, the app shows what you did the previous time and pre-fills the new sets with those values, so you only change what went up.
- Mistakes are caught before saving (a missing weight, a set with no reps), the problem is highlighted, and nothing you typed is lost.
- Fix or delete any past workout later. Deleting asks for confirmation first.

### Plan the session the day before, follow it in the gym

**Import your trainer's plan.** Pick the plan PDF your trainer sends (the spreadsheet export with sets, reps, tempo, RIR and weight) and the app turns it into a planned workout for tomorrow:
- Every exercise comes in with its **sets, reps or time** (`40s` is read as a timed exercise) and **weight** (`12,5kg` and even `6/8kg` work). Tempo and RIR are skipped.
- The **technique video** linked on an exercise name comes along too, and is saved on the exercise. Exercises without a video are fine.
- Exercise names stay **exactly as your trainer writes them**.
- **You check everything before it is saved.** Known exercises are matched automatically (ignoring letter case, spacing and small differences like "Russian twist's"). For a new name, you choose: create it, with the kind the app guessed and that you can change, or link it to an exercise you already have. Values that could not be read are flagged so you can fill them in.
- The PDF is read **in your browser**; the file itself is never uploaded or stored.

**Or plan a workout by hand.** Planned workouts wait under *Planned* on the home screen, soonest first. Change them as often as you like the evening before. They don't count as history, don't show up as "last time" values and don't affect your progress charts until you actually do them.

**Repeat a past session.** Open any finished workout and choose *Repeat as draft*: you get a new plan dated today with the same exercises, in the same order, with the sets and values from that session and nothing ticked. Tweak it, then save; nothing is stored until you do, and the original workout stays untouched.

**Gym mode.** Open the plan at the gym (*Start in gym*):
- Tick each set as you finish it and adjust the numbers to what you actually did: the plan is only a starting point.
- See last time's numbers and open the exercise's video with one tap, without leaving the workout.
- **Every change is saved at once.** If the connection drops, the app shows *Not saved* and keeps retrying, and it warns you before you leave a page with unsaved changes. Ticked sets survive a locked phone or a page reload.

**Machine taken? Swap in place.** Replace an exercise with another one from your list, right where it is in the plan. The exercises you've done most recently come first, and you can search by name. If the new exercise is the same kind, the planned sets carry over; otherwise you start from its last-time values.

**Finish** turns the plan into a regular workout with only the sets you ticked. A change still arriving from another tab after you finished is refused, so the finished workout always stays exactly what you did.

### Exercises that fit how you actually train
Every exercise has a kind, and the kind decides what you record for each set:

| Kind | Example | Recorded per set |
| --- | --- | --- |
| Weight × reps | Bench press | weight (kg) and reps |
| Bodyweight | Pull-ups | reps, optional added weight |
| Timed | Plank | duration |
| Cardio | Rowing | duration, optional distance |

Build your own exercise list, rename an exercise at any time without losing its history, and attach a **video link** (for example a YouTube technique video) that opens in a new tab with one tap. The kind is fixed only once you have actually done the exercise, so a kind guessed wrong during an import can still be corrected.

### See your progress
- A **progress chart per exercise**, using the measure that makes sense for its kind: heaviest set for lifts, most reps for bodyweight work, longest hold for timed exercises, and longest duration and distance for cardio.
- A **full history** under the chart: every session with that exercise, newest first, with all its sets.
- Open progress from the exercise list, or straight from an exercise inside any workout.

### Private and yours
- **Single user, self-hosted.** Your data lives in one file on your own machine or server. No account with anyone, no tracking, no ads. Imported plan PDFs are read in the browser and never stored.
- **Stay logged in** for 30 days, so opening the app at the gym is instant.
- **Security built in:** throttled login attempts, protection against cross-site attacks, strict browser security headers, and only `https://` video links.
- Runs anywhere Docker runs: your PC on home Wi-Fi, a small home server, or a cloud host.

## Built to be trusted with your data

Every feature is covered by automated tests at three levels: logic, API, and real-browser tests on a phone-sized screen. They run on every change. Workouts survive restarts and updates, and that is tested too.

## Try it

You need Docker. Copy `.env.example` to `.env`, set a username, password and secret, then:

```bash
docker compose up --build
```

Open http://localhost:3000, or `http://<your-pc-ip>:3000` from your phone on the same Wi-Fi.

Configuration, phone access, tests and development are all in the **[Development Guide](DEVELOPMENT.md)**.
