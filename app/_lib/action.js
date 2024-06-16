'use server';

import { revalidatePath } from 'next/cache';
import { auth, signIn, signOut } from './auth';
import supabase from './supabase';
import { getBookings } from './data-service';
import { redirect } from 'next/navigation';

export async function createBooking(bookingData, formData) {
	const session = await auth();
	if (!session) throw new Error('You must be logged in');

	const newBoooking = {
		...bookingData,
		guestId: session.user.guestId,
		numGuests: Number(formData.get('numGuests')),
		observations: formData.get('observations').slice(0, 1000),
		extrasPrice: 0,
		totalPrice: bookingData.cabinPrice,
		isPaid: false,
		hasBreakfast: false,
		status: 'unconfirmed',
	};

	const { error } = await supabase.from('bookings').insert([newBooking]);

	if (error) throw new Error('Booking could not be created');

	revalidatePath(`/cabins/${bookingData.cabinId}`);

	redirect('/thankyou');
}

//UPDATERESERVATION
export async function updateReservation(formData) {
	const session = await auth();
	if (!session) throw new Error('You must be logged in');

	const numGuests = formData.get('numGuests');
	const bookingId = formData.get('bookingId');
	const observations = formData.get('observations').slice(0, 1000);

	const guestBookings = await getBookings(session.user.guestId);
	const guestBookingsIds = guestBookings.map((booking) => booking.id);

	if (!guestBookingsIds.includes(+bookingId))
		throw new Error('You are not allowed to update the reservation');

	// if (!isValidNumber(numGuests))
	// 	throw new Error('enter valid number of guests 1 - 19');

	const updatedFields = {
		numGuests,
		observations,
	};

	const { error } = await supabase
		.from('bookings')
		.update(updatedFields)
		.eq('id', bookingId)
		.select()
		.single();

	if (error) throw new Error('Booking could not be updated');

	revalidatePath(`/account/reservations/edit/${bookingId}`);
	revalidatePath('/account/reservations');
	redirect('/account/reservations');
}

//UPDATEGuest
export async function updateGuest(formData) {
	const session = await auth();
	if (!session) throw new Error('You must be logged in');

	const nationalID = formData.get('nationalID');
	const [nationality, countryFlag] = formData.get('nationality').split('%');

	if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID))
		throw new Error('Please provide a valid national ID');

	const updateData = {
		nationalID,
		nationality,
		countryFlag,
	};

	const { data, error } = await supabase
		.from('guests')
		.update(updateData)
		.eq('id', session.user.guestId)
		.select()
		.single();

	if (error) throw new Error('Guest could not be updated');

	revalidatePath('/account/profile');
}
//DELETE
export async function deleteReservation(bookingId) {
	const session = await auth();
	if (!session) throw new Error('You must be logged in');

	const guestBookings = await getBookings(session.user.guestId);
	const guestBookingsIds = guestBookings.map((booking) => booking.id);

	if (!guestBookingsIds.includes(bookingId))
		throw new Error('You are not allowed to delete the booking');

	const { error } = await supabase
		.from('bookings')
		.delete()
		.eq('id', bookingId);

	if (error) throw new Error('Booking could not be deleted');

	revalidatePath('/account/reservations');
}

export async function signInAction() {
	await signIn('google', { redirectTo: '/account' });
}

export async function signOutAction() {
	await signOut({ redirectTo: '/' });
}
