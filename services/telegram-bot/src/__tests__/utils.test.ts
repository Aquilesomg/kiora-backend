import { escapeHtml, formatMessageToHtml } from '../utils';

describe('Telegram Bot Utils', () => {
    describe('escapeHtml', () => {
        it('debe escapar <, > y &', () => {
            expect(escapeHtml('Hola <Mundo> & Amigos')).toBe('Hola &lt;Mundo&gt; &amp; Amigos');
        });

        it('debe devolver string vacio si recibe null o undefined', () => {
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml(undefined)).toBe('');
        });
    });

    describe('formatMessageToHtml', () => {
        it('debe limpiar etiquetas HTML pero mantener <br> como salto de linea', () => {
            const subject = 'Test Subject';
            const htmlBody = 'Hola<br/>Este es un <div>test</div>';
            
            const result = formatMessageToHtml(subject, htmlBody);
            
            expect(result).toBe('<b>Test Subject</b>\n\nHola\nEste es un test');
        });

        it('debe convertir markdown ** y __ a <b>', () => {
            const subject = 'Alerta';
            const htmlBody = 'Este texto es **importante** y __muy__ urgente';
            
            const result = formatMessageToHtml(subject, htmlBody);
            
            expect(result).toBe('<b>Alerta</b>\n\nEste texto es <b>importante</b> y <b>muy</b> urgente');
        });
    });
});
