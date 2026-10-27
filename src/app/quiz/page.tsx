import { redirect } from 'next/navigation';

// Quizzes live in the Dashboard's quiz section.
export default function QuizLobbyPage() { redirect('/dashboard#quizzes'); }
