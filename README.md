# My Fitness

**Your gym notebook, on your phone. Know what you lifted last time, and see whether you are getting stronger.**

Most people who train regularly hit the same wall: standing at the bench, trying to remember whether last week was 50 kg for 8 or 52.5 kg for 6. Paper notebooks get lost, spreadsheets are painful on a phone, and the big fitness apps bury a simple log under social feeds, subscriptions and plans you never asked for.

My Fitness does one thing well: it records what you did in the gym and shows you how you are progressing. It is a small private web app you host yourself, built for one person and designed to be used one-handed on a phone between sets or right after a session.

## What it does today

### Log a workout in under a minute
- Record a session with its date (today by default), whether you trained **solo or with a trainer**, and any number of exercises and sets.
- **Last time's numbers are already there.** When you add an exercise, the app shows what you did the previous time and pre-fills the new sets with those values, so you only change what went up.
- Mistakes are caught before saving (a missing weight, a set with no reps), the problem is highlighted, and nothing you typed is lost.
- Fix or delete any past workout later. Deleting asks for confirmation first.

### Exercises that fit how you actually train
Every exercise has a kind, and the kind decides what you record for each set:

| Kind | Example | Recorded per set |
| --- | --- | --- |
| Weight × reps | Bench press | weight (kg) and reps |
| Bodyweight | Pull-ups | reps, optional added weight |
| Timed | Plank | duration |
| Cardio | Rowing | duration, optional distance |

Build your own exercise list, and rename an exercise at any time without losing its history.

### See your progress
- A **progress chart per exercise**, using the measure that makes sense for its kind: heaviest set for lifts, most reps for bodyweight work, longest hold for timed exercises, and longest duration and distance for cardio.
- A **full history** under the chart: every session with that exercise, newest first, with all its sets.
- Open progress from the exercise list, or straight from an exercise inside any workout.

### Private and yours
- **Single user, self-hosted.** Your data lives in one file on your own machine or server. No account with anyone, no tracking, no ads.
- **Stay logged in** for 30 days, so opening the app at the gym is instant.
- **Security built in:** throttled login attempts, protection against cross-site attacks, and strict browser security headers.
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
