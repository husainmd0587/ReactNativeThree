// CustomModal.js - Complete custom modal without React Native Modal
import React, { useRef, useEffect, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Animated,
	Dimensions,
	BackHandler,
	SafeAreaView,
	TouchableWithoutFeedback,
	Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AppModal = ({
	visible,
	onClose,
	title,
	children,
	animationType = 'slide',
	closeText = 'Close',
	closeOnBackdrop = true,
	closeOnBackPress = true,
	height = '85%',
	width = '90%',
	contentStyle,
	headerStyle,
	titleStyle,
	closeButtonStyle,
	closeTextStyle,
	backdropColor = 'rgba(0, 0, 0, 0.7)',
	childrenContainerStyle,
	onAnimationComplete,
}) => {
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.8)).current;
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (!closeOnBackPress) return;
		const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
			if (visible) {
				handleClose();
				return true;
			}
			return false;
	});

	return () => backHandler.remove();
	}, [visible, closeOnBackPress]);

	useEffect(() => {
		if (visible) {
			showModal();
		} else {
			hideModal();
		}
	}, [visible]);

	const showModal = () => {
		setIsVisible(true);
		if (animationType === 'none') {
	slideAnim.setValue(0);
	fadeAnim.setValue(1);
	scaleAnim.setValue(1);
			onAnimationComplete?.(true);
			return;
		}
		if (animationType === 'fade') {
			Animated.parallel([
				Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
				Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
			]).start(() => onAnimationComplete?.(true));
		} else if (animationType === 'scale') {
			Animated.parallel([
				Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
				Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
			]).start(() => onAnimationComplete?.(true));
		} else {
			Animated.parallel([
				Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
				Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
			]).start(() => onAnimationComplete?.(true));
		}
	};

	const hideModal = () => {
		if (animationType === 'none') {
	setIsVisible(false);
	onAnimationComplete?.(false);
	return;
		}

		if (animationType === 'fade' || animationType === 'scale') {
			Animated.parallel([
				Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
				Animated.spring(scaleAnim, { toValue: 0.8, friction: 6, tension: 60, useNativeDriver: true }),
			]).start(() => {
				setIsVisible(false);
				onAnimationComplete?.(false);
			});
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
				Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
			]).start(() => {
				setIsVisible(false);
				onAnimationComplete?.(false);
			});
		}
	};

	const handleClose = () => {
		if (onClose) onClose();
	};

	const handleBackdropPress = () => {
		if (closeOnBackdrop) handleClose();
	};

	const getAnimationStyle = () => {
		if (animationType === 'fade' || animationType === 'scale') {
			return { opacity: fadeAnim, transform: [{ scale: scaleAnim }] };
		}
		if (animationType === 'slide') {
			return { opacity: fadeAnim, transform: [{ translateY: slideAnim }] };
		}
		return {};
	};

	if (!isVisible && !visible) return null;

	return (
		<View style={styles.container}>
			<TouchableWithoutFeedback onPress={handleBackdropPress}>
				<Animated.View style={[styles.backdrop, { backgroundColor: backdropColor }, { opacity: fadeAnim }]}> 
					<TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
						<Animated.View style={[styles.contentWrapper, getAnimationStyle(), { height, width, maxHeight: '95%', maxWidth: '95%' }, contentStyle]}>
							<GestureHandlerRootView style={styles.gestureHost}>
								{title && (
									<View style={[styles.header, headerStyle]}>
										<Text style={[styles.title, titleStyle]} numberOfLines={1}>{title}</Text>
										<TouchableOpacity onPress={handleClose} style={[styles.closeButton, closeButtonStyle]} activeOpacity={0.7}>
											<Text style={[styles.closeButtonText, closeTextStyle]}>{closeText}</Text>
										</TouchableOpacity>
									</View>
								)}
								<View style={[styles.body, childrenContainerStyle]}>{children}</View>
							</GestureHandlerRootView>
						</Animated.View>
					</TouchableWithoutFeedback>
				</Animated.View>
			</TouchableWithoutFeedback>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, elevation: 999 },
	backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
	contentWrapper: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 20 },
	header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0F172A', minHeight: 56, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
	title: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
	closeButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F59E0B', borderRadius: 8 },
	closeButtonText: { color: '#000', fontWeight: '700', fontSize: 14 },
	body: { flex: 1, backgroundColor: '#000' },
	gestureHost: { flex: 1, width: '100%', overflow: 'hidden' },
});

export default AppModal;
export { AppModal };
