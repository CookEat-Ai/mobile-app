import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TrackingCaptureSurface } from '../../components/tracking/TrackingCaptureSurface';
import { MealPhotoCapture } from '../../components/tracking/MealPhotoCapture';
import { PhotoMealReveal } from '../../components/tracking/PhotoMealReveal';
import { apiService } from '../../services/api';
import { getAnonymousUserId } from '../../services/anonymousSession';
import { mealNutrition, loadFoodDefaults, applyFoodDefaults, foodNutrition, loadTrackedMeals, saveTrackedMeal, trackingDateKey, validTrackingDate, type FoodNutrition, type MealPhotoAnalysis, type PhotoFood, type TrackedMeal } from '../../services/mealTracking';
import { createPhotoMealSaver, type PhotoMealSaveInput } from '../../services/photoMealAutosave';
import { persistTrackingPhoto } from '../../services/trackingPhotos';
import { feedback } from '../../services/haptics';
import analytics from '../../services/analytics';
const trackStage = (stage: string, properties: Record<string, string | number | boolean> = {}) => { void analytics.track(`meal_tracking_${stage}`, properties).catch(() => undefined); };
export default function TrackingCaptureScreen() {
    const { t } = useTranslation(), params = useLocalSearchParams<{
        entryId?: string;
        date?: string;
        isOnboarding?: string;
    }>();
    const isOnboarding = params.isOnboarding === 'true';
    const [permission, requestPermission] = useCameraPermissions(), [cameraError, setCameraError] = useState(false), [cameraReady, setCameraReady] = useState(false);
    const [foreground, setForeground] = useState(AppState.currentState === 'active');
    const [phase, setPhase] = useState<'capture' | 'result'>('capture');
    const [photo, setPhoto] = useState<{
        uri: string;
        width: number;
        height: number;
    } | null>(null), [analysis, setAnalysis] = useState<MealPhotoAnalysis | null>(null);
    const [title, setTitle] = useState(''), [items, setItems] = useState<PhotoFood[]>([]), [mealType, setMealType] = useState<TrackedMeal['mealType'] | null>(null);
    const [error, setError] = useState(''), [busy, setBusy] = useState(false), [saving, setSaving] = useState(false), [saved, setSaved] = useState<TrackedMeal | null>(null);
    const [nutritionOverride, setNutritionOverride] = useState<FoodNutrition | null>(null);
    const changeItems = (next: PhotoFood[]) => { setItems(next); setNutritionOverride(null); };
    const [saver] = useState(() => createPhotoMealSaver({
        confirm: async input => {
            const response = await apiService.confirmTrackedMeal(input.analysis.scanId, {title: input.title, items: input.items, mealType: input.mealType, nutritionOverride: input.nutritionOverride,
                shareWithCatalog: !input.nutritionOverride && !input.items.some(item => item.nutritionEdited)}, input.photo.uri);
            if (!response.data) throw new Error(response.error || 'tracking_save_failed');
            return response.data;
        }, persistPhoto: persistTrackingPhoto, saveMeal: saveTrackedMeal,
    }));
    const persistRef = useRef<(() => Promise<TrackedMeal | null>) | null>(null);
    const snapshot = useRef<PhotoMealSaveInput | null>(null), doneBusy = useRef(false);
    const [recognitionReady,setRecognitionReady]=useState(false);
    const [expanded,setExpanded]=useState(!!params.entryId);
    const [existing, setExisting] = useState<TrackedMeal | null>(null), [loadingEntry, setLoadingEntry] = useState(!!params.entryId);
    const capturedAt = useRef(new Date());
    const camera = useRef<CameraView>(null), version = useRef(0), controller = useRef<AbortController | null>(null), busyRef = useRef(false), active = useRef(true);
    useEffect(() => { const subscription = AppState.addEventListener('change', state => setForeground(state === 'active')); return () => subscription.remove(); }, []);
    useEffect(() => { active.current = true; return () => { active.current = false; version.current++; controller.current?.abort(); }; }, []);
    useEffect(() => { trackStage('opened', { editing: !!params.entryId }); }, [params.entryId]);
    useFocusEffect(useCallback(() => () => { version.current++; controller.current?.abort(); }, []));
    useEffect(() => {
        if (!params.entryId)
            return;
        let valid = true;
        void (async () => {
            const userId = await getAnonymousUserId();
            const record = (await loadTrackedMeals(userId)).find(m => m.id === params.entryId);
            if (!record)
                throw new Error('meal_missing');
            if (!valid)
                return;
            if (!record.photoUri || !record.photoWidth || !record.photoHeight) {
                router.replace({ pathname: '/tracking/manual', params: { entryId: record.id } });
                return;
            }
            setNutritionOverride(record.nutritionOverride || null);
            saver.restore(record);
            setSaved(record);
            setExisting(record);
            setPhoto({ uri: record.photoUri, width: record.photoWidth, height: record.photoHeight });
            setAnalysis({ scanId: record.id, kind: 'meal', title: record.title, summary: '', mealType: record.mealType, items: record.items, nutrition: record.nutrition, estimated: true });
            setTitle(record.title);
            setItems(record.items);
            setMealType(record.mealType);
            setRecognitionReady(true);
            setPhase('result');
        })().catch(() => { if (valid)
            setError(t('tracking.loadError')); }).finally(() => { if (valid)
            setLoadingEntry(false); });
        return () => { valid = false; };
    }, [params.entryId, t, saver]);
    const close = () => { if (snapshot.current) void persistRef.current?.(); version.current++; controller.current?.abort(); router.back(); };
    const analyze = async (image: {
        uri: string;
        width: number;
        height: number;
    }) => {
        const attempt = ++version.current;
        trackStage('analysis_started');
        controller.current?.abort();
        const abort = new AbortController();
        controller.current = abort;
        setError('');
        setAnalysis(null);
        setNutritionOverride(null);
        setRecognitionReady(false);
        setPhase('result');
        setPhoto(image);
        const result = await apiService.analyzeTrackedMeal(image.uri, abort.signal)
            .catch(() => ({ data: undefined, error: t('tracking.analysisError') }));
        if (!active.current || attempt !== version.current)
            return;
        if (!result.data?.analysis) {
            trackStage('analysis_failed');
            setError(result.error || t('tracking.analysisError'));
            return;
        }
        const detected = result.data.analysis;
        try {
            const defaults = await loadFoodDefaults(await getAnonymousUserId());
            if (!active.current || attempt !== version.current) return;
            detected.items = applyFoodDefaults(detected.items, defaults);
            detected.nutrition = foodNutrition(detected.items);
        } catch {
            if (active.current && attempt === version.current) setError(t('tracking.loadError'));
            return;
        }
        trackStage('analysis_completed', { kind: detected.kind, item_count: detected.items.length });
        setAnalysis(detected);
        setTitle(detected.title || t('tracking.untitledMeal'));
        setItems(detected.items);
        setMealType(detected.mealType || null);
    };
    const accept = async (asset: {
        uri: string;
        width: number;
        height: number;
    }) => {
        const attempt = ++version.current;
        capturedAt.current = new Date();
        setSaved(null);
        setMealType(null);
        setRecognitionReady(false);setExpanded(false);setAnalysis(null);setItems([]);setTitle('');setPhoto(asset);setPhase('result');
        setBusy(true);
        setError('');
        try {
            const processed = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: asset.width >= asset.height ? { width: 1600 } : { height: 1600 } }], { compress: .78, format: ImageManipulator.SaveFormat.JPEG });
            if (!active.current || attempt !== version.current)
                return;
            await analyze(processed);
        }
        catch {
            if (active.current && attempt === version.current)
                setError(t('tracking.photoError'));
        }
        finally {
            busyRef.current = false;
            if (active.current)
                setBusy(false);
        }
    };
    const take = async () => {
        if (busyRef.current || !cameraReady || !camera.current)
            return;
        busyRef.current = true;
        setBusy(true);
        void feedback.confirm();
        try {
            const image = await camera.current.takePictureAsync({ quality: .9, base64: false, exif: false });
            if (image)
                await accept(image);
            else
                throw new Error('photo_missing');
        }
        catch {
            if (active.current)
                setError(t('tracking.photoError'));
            busyRef.current = false;
            setBusy(false);
        }
    };
    const pick = async () => {
        if (busyRef.current)
            return;
        busyRef.current = true;
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false });
            if (result.canceled) {
                busyRef.current = false;
                return;
            }
            if (!active.current)
                return;
            await accept(result.assets[0]);
        }
        catch {
            busyRef.current = false;
            if (active.current) {
                setBusy(false);
                setError(t('tracking.photoError'));
            }
        }
    };
    const retake = () => { setExpanded(false);setRecognitionReady(false);version.current++; controller.current?.abort(); setAnalysis(null); setPhoto(null); setError(''); setPhase('capture'); setCameraReady(false); busyRef.current = false; setBusy(false); };
    const persist = useCallback(async () => {
        const current = snapshot.current;
        if (!current) return null;
        if (active.current) { setSaving(true); setError(''); }
        try {
            const userId = await getAnonymousUserId();
            const record = await saver.save({...current, userId});
            if (active.current) setSaved(record);
            return record;
        } catch {
            if (active.current) setError(t('tracking.saveError'));
            return null;
        } finally { if (active.current) setSaving(false); }
    }, [saver, t]);
    persistRef.current = persist;
    const valid = !!analysis && analysis.kind !== 'not_food' && !!photo && !!mealType && !!title.trim() && !!mealNutrition(items, nutritionOverride)
        && items.every(item => item.grams >= 1 && item.grams <= 2000 && Number.isInteger(item.grams));
    snapshot.current = valid ? {userId: '', analysis: analysis!, photo: photo!, title, items, mealType: mealType!, nutritionOverride,
        date: existing?.date || (params.date && validTrackingDate(params.date) && params.date <= trackingDateKey() ? params.date : trackingDateKey(capturedAt.current)),
        createdAt: existing?.createdAt || capturedAt.current.toISOString()} : null;
    useEffect(() => {
        if (!snapshot.current || saver.isSaved(snapshot.current)) return;
        // First analysis is added immediately; subsequent edits are coalesced.
        const timer = setTimeout(() => {void persist();}, saved ? 350 : 0);
        return () => clearTimeout(timer);
    }, [analysis, photo, title, items, mealType, nutritionOverride, persist, saver, saved]);
    const done = async () => {
        if (!recognitionReady || saving || doneBusy.current) return;
        doneBusy.current = true;
        const record = await persist();
        doneBusy.current = false;
        if (!record || !active.current) return;
        void feedback.success();
        if (isOnboarding) router.dismissTo({pathname: '/onboarding/photoTrackingDemo', params: {completedId: record.id}});
        else router.dismissTo('/(tabs)/tracking');
    };
    let content: React.ReactNode;
    if (loadingEntry) content = <View style={[appStyles.screen, {justifyContent:'center'}]}><ActivityIndicator color={theme.yellow}/></View>;
    else if (phase === 'result' && photo) content = <PhotoMealReveal photo={photo} analysis={analysis} title={title} items={items} onTitle={setTitle} onItems={changeItems} nutritionOverride={nutritionOverride} onNutritionOverride={setNutritionOverride} onSave={()=>{void done();}} saveActionLabel={t(error ? 'common.retry' : 'tracking.viewDay')} autoSaved={!!saved} onExpand={()=>setExpanded(true)} onComplete={()=>setRecognitionReady(true)} onBack={close} onRetry={()=>{void analyze(photo);}} onRetake={retake} saving={saving} error={error} editing={!!params.entryId} processing={!error}/>;
    else content = <MealPhotoCapture cameraRef={camera} granted={!!permission?.granted} cameraError={cameraError} canAskAgain={permission?.canAskAgain !== false} active={foreground} ready={cameraReady} busy={busy} error={error} onClose={close} onAllow={() => { if (permission?.canAskAgain === false) void Linking.openSettings(); else void requestPermission(); }} onReady={() => setCameraReady(true)} onCameraError={() => setCameraError(true)} onTake={() => { void take(); }} onPick={() => { void pick(); }} onManual={isOnboarding ? undefined : () => router.replace({ pathname: '/tracking/manual', params: { date: params.date || trackingDateKey() } })}/>;
    return <TrackingCaptureSurface expanded={expanded}><Stack.Screen options={{headerShown:false,gestureEnabled:false,statusBarStyle:expanded?'dark':'light',contentStyle:{backgroundColor:'transparent'}}}/>{content}</TrackingCaptureSurface>;

}
