from django.shortcuts import render, redirect
from .forms import RegisterForm
from django.contrib.auth import login as auth_login
from .forms import LoginForm


def register(request):

    if request.method == 'POST':
        form = RegisterForm(request.POST)

        if form.is_valid():
            form.save()
            return redirect('login')

    else:
        form = RegisterForm()

    return render(request, 'accounts/register.html', {
        'form': form
    })

def login(request):
    if request.method == 'POST': 
        form = LoginForm(request, data=request.POST)

        if form.is_valid():
            user = form.get_user()
            auth_login(request, user)

            return redirect('/')

    else: 
        form = LoginForm(request)

    return render(request, 'accounts/login.html', {
        'form': form
    })