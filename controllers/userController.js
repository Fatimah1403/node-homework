function register(req, res, next) {
    try {
        const { name, email, password } = req.body;

        const newUser = {
            id: global.users.length + 1,
            name,
            email,
            password
        };

        global.users.push(newUser);

        global.user_id = newUser.id;
        res.status(201).json({ name: newUser.name, email: newUser.email });
    } catch (error) {
        next(error);
    }
}

function logon(req, res, next) {
    try {
        const { email, password } = req.body;

        const user = global.users.find((u) => u.email === email && u.password === password);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password. ",
            })
        }
        global.user_id = user.id

        return res.status(200).json({
           name: user.name,
           email: user.email,
        })

    } catch (error) {
        next(error);
    }
}

function logoff(req, res, next) {
    try {
        global.user_id = null;
        return res.status(200).json({
            message: "User logged off successfully.",
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { register, logon, logoff };