import type { MealPhotoAnalysis, PhotoFood } from './mealTracking';

/** SSE frames may be split anywhere, including inside a UTF-8 name or JSON string. */
export function createMealPhotoStream(onFood: (item: PhotoFood) => void) {
    let pending = '', analysis: MealPhotoAnalysis | null = null, ended = false;
    const ids = new Set<string>();
    return {
        push(text: string) {
            pending += text;
            if (pending.length > 200_000) throw new Error('photo_stream_too_large');
            let boundary: number;
            while ((boundary = pending.indexOf('\n\n')) >= 0) {
                const frame = pending.slice(0, boundary);
                pending = pending.slice(boundary + 2);
                if (ended) continue;
                const event = /^event:\s*([\w-]+)$/m.exec(frame)?.[1];
                const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
                if (!data) continue; // Heartbeat.
                const payload = JSON.parse(data);
                if (event === 'error') throw new Error('photo_analysis_failed');
                if (event === 'food' || event === 'food-location') {
                    const item = payload.item as PhotoFood;
                    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || !Number.isFinite(item.grams)) throw new Error('invalid_photo_food');
                    if (event === 'food-location') { if (ids.has(item.id)) onFood(item); }
                    else if (!ids.has(item.id)) { ids.add(item.id); onFood(item); }
                } else if (event === 'done') {
                    if (!payload.analysis?.scanId || !Array.isArray(payload.analysis.items)) throw new Error('invalid_photo_analysis');
                    analysis = payload.analysis;
                    ended = true;
                }
            }
        },
        finish(): MealPhotoAnalysis {
            if (!ended || !analysis) throw new Error('incomplete_photo_stream');
            return analysis;
        },
        get done() { return ended; },
    };
}
