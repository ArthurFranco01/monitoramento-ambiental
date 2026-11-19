# ********************* NOTIFICAÇÃO POR E-MAIL *********************
# Envia um e-mail quando o alerta de chuva iminente dispara.
# Usa SMTP com uma conta de e-mail existente (ex: Gmail + senha de app),
# nunca uma senha fixa no código.

import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
EMAIL_REMETENTE = os.environ.get('EMAIL_REMETENTE')
EMAIL_SENHA_APP = os.environ.get('EMAIL_SENHA_APP')
EMAIL_DESTINATARIO = os.environ.get('EMAIL_DESTINATARIO')


def enviar_alerta_email(detalhes):
    """Envia o e-mail de alerta. Retorna True se enviou, False se falhou ou
    não está configurado (nesse caso só loga, não derruba a aplicação)."""
    if not (EMAIL_REMETENTE and EMAIL_SENHA_APP and EMAIL_DESTINATARIO):
        print(
            "Alerta de chuva: e-mail não enviado — configure EMAIL_REMETENTE, "
            "EMAIL_SENHA_APP e EMAIL_DESTINATARIO para ativar o envio."
        )
        return False

    msg = EmailMessage()
    msg['Subject'] = 'Alerta: chuva iminente detectada'
    msg['From'] = EMAIL_REMETENTE
    msg['To'] = EMAIL_DESTINATARIO
    msg.set_content(
        "Alerta de chuva iminente detectado pela caixinha de monitoramento.\n\n"
        f"Motivo: {'; '.join(detalhes.get('motivo', []))}\n"
        f"Pressão atual: {detalhes.get('pressao_atual')} hPa\n"
        f"Umidade atual: {detalhes.get('umidade_atual')}%\n"
        f"Última leitura: {detalhes.get('ultima_leitura')}\n"
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as servidor:
            servidor.starttls()
            servidor.login(EMAIL_REMETENTE, EMAIL_SENHA_APP)
            servidor.send_message(msg)
        print("E-mail de alerta de chuva enviado com sucesso")
        return True
    except Exception as e:
        print(f"Erro ao enviar e-mail de alerta: {e}")
        return False
