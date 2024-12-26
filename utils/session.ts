export const logIn = async (req, userId) => {
	req.session.userId = userId;
	await req.session.save(err => {
		if (err) throw err;
	});
};

export const logOut = (req, res) => {
	new Promise<void>((resolve, reject) => {
		req.session.destroy(err => {
			if (err) reject(err);
			resolve();
		});
	});
};

export const isLoggedIn = (req) => { 
	console.log(req.session);
	return !!req?.session?.userId 
};