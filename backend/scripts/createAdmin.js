const readline = require('readline');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ask(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    }));
}

// Pide un valor sin mostrarlo en pantalla (para contraseñas).
// Evita que quede visible en el scrollback de la terminal.
function askHidden(query) {
    return new Promise((resolve) => {
        process.stdout.write(query);
        let value = '';
        const stdin = process.stdin;
        stdin.resume();
        stdin.setRawMode(true);
        stdin.setEncoding('utf8');

        const onData = (char) => {
            char = char.toString('utf8');
            if (char === '\n' || char === '\r' || char === '\u0004') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener('data', onData);
                process.stdout.write('\n');
                resolve(value);
            } else if (char === '\u0003') {
                // Ctrl+C
                process.stdout.write('\n');
                process.exit(1);
            } else if (char === '\u007f' || char === '\b') {
                value = value.slice(0, -1);
            } else {
                value += char;
            }
        };

        stdin.on('data', onData);
    });
}

async function main() {
    try {
        const emailRaw = await ask('Correo del nuevo admin: ');
        const email = emailRaw.trim().toLowerCase();

        if (!EMAIL_REGEX.test(email)) {
            console.error('❌ Correo inválido.');
            process.exitCode = 1;
            return;
        }

        const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.error('❌ Ya existe un admin registrado con ese correo.');
            process.exitCode = 1;
            return;
        }

        const password = await askHidden('Contraseña (mínimo 8 caracteres): ');
        if (!password || password.length < 8) {
            console.error('❌ La contraseña debe tener al menos 8 caracteres.');
            process.exitCode = 1;
            return;
        }

        const confirm = await askHidden('Confirma la contraseña: ');
        if (password !== confirm) {
            console.error('❌ Las contraseñas no coinciden.');
            process.exitCode = 1;
            return;
        }

        // 12 rounds: más costoso que el default (10), aceptable porque esto
        // se corre una sola vez de forma manual, no en cada request de login.
        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            'INSERT INTO admins (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, passwordHash]
        );

        console.log(`✅ Admin creado correctamente: ${result.rows[0].email} (id: ${result.rows[0].id})`);
    } catch (error) {
        console.error('❌ Error al crear el admin:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();